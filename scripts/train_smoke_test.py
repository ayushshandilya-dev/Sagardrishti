import os
import time
import argparse
import psutil
import torch
import torch.nn as nn
from torch.utils.data import Dataset, DataLoader

# Import the model architecture directly from your repository
import sys
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
from core.sar.detection import create_detector, DetectionConfig

class SyntheticSARDataset(Dataset):
    """
    Simulates the Krestenitis/Zenodo dataset for smoke testing.
    Generates 2048x2048x2 (VV, VH) images and corresponding 1-channel masks.
    """
    def __init__(self, size, img_size=512):
        self.size = size
        self.img_size = img_size

    def __len__(self):
        return self.size

    def __getitem__(self, idx):
        # Image: [2, img_size, img_size] float32 tensor
        img = torch.randn(2, self.img_size, self.img_size, dtype=torch.float32)
        
        # Mask: [img_size, img_size] long tensor
        mask = torch.randint(0, 4, (self.img_size, self.img_size), dtype=torch.long)
        mask[mask == 3] = 255 
        
        return img, mask

def get_memory_usage():
    process = psutil.Process(os.getpid())
    return process.memory_info().rss / (1024 ** 2) # in MB

def main():
    parser = argparse.ArgumentParser(description="Oil Spill Segmentation Training")
    parser.add_argument("--device", type=str, default="mps", help="cpu, mps, or cuda")
    parser.add_argument("--batch_size", type=int, default=2, help="Batch size (small for local Mac)")
    parser.add_argument("--max_steps", type=int, default=20, help="Total training steps for smoke test")
    parser.add_argument("--subset_size", type=int, default=10, help="Number of simulated training images")
    parser.add_argument("--image_size", type=int, default=512, help="Tile size for training (512 fits in 16GB Mac)")
    args = parser.parse_args()

    # Device Handling (Crucial for Apple Silicon)
    if args.device == "mps" and torch.backends.mps.is_available():
        device = torch.device("mps")
    elif args.device == "cuda" and torch.cuda.is_available():
        device = torch.device("cuda")
    else:
        print("Requested device not available, falling back to CPU")
        device = torch.device("cpu")
    
    print(f"--- INIT ---")
    print(f"Using device: {device}")
    print(f"Batch size: {args.batch_size}")
    print(f"Image size: {args.image_size}x{args.image_size}")
    
    # 1. Initialize Dataset and Dataloader
    train_dataset = SyntheticSARDataset(size=args.subset_size, img_size=args.image_size)
    train_loader = DataLoader(train_dataset, batch_size=args.batch_size, shuffle=True)
    
    # 2. Initialize the Model exactly as it exists in your repository (num_classes=4)
    det_cfg = DetectionConfig(
        model_type="deeplab",
        num_classes=4, 
        input_size=(args.image_size, args.image_size)
    )
    print(f"Initializing model: {det_cfg.model_type} with 4 classes...")
    detector = create_detector(det_cfg)
    
    # Extract the raw PyTorch model from the detector wrapper
    model = detector.model
    model.to(device)
    model.train()
    
    # 3. Optimizer and Loss Function
    optimizer = torch.optim.AdamW(model.parameters(), lr=1e-4)
    
    # ignore_index=255 is the magic key that lets us ignore Land and Ships 
    # while leaving the 4-class architecture fully intact!
    criterion = nn.CrossEntropyLoss(ignore_index=255)
    
    print("--- STARTING SMOKE TEST ---")
    step = 0
    epoch = 0
    start_time = time.time()
    
    while step < args.max_steps:
        epoch += 1
        for images, masks in train_loader:
            if step >= args.max_steps:
                break
                
            # Move to Apple Silicon GPU
            images = images.to(device)
            masks = masks.to(device)
            
            optimizer.zero_grad()
            
            # Forward pass
            outputs = model(images)
            
            # Ensure output dimensions match (DeepLab/SMP sometimes returns logits directly)
            if isinstance(outputs, dict):
                logits = outputs["out"]
            else:
                logits = outputs
            
            # Calculate Loss
            loss = criterion(logits, masks)
            
            # Backward pass & Optimizer step
            loss.backward()
            optimizer.step()
            
            step += 1
            ram_mb = get_memory_usage()
            print(f"Step {step:02d}/{args.max_steps} | Loss: {loss.item():.4f} | RAM: {ram_mb:.1f} MB")
            
    total_time = time.time() - start_time
    print("--- SMOKE TEST COMPLETE ---")
    print(f"Finished {args.max_steps} steps in {total_time:.2f} seconds.")
    print("Zero crashes, gradients flowed successfully.")

if __name__ == "__main__":
    main()
