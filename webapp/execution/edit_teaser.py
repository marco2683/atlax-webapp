import imageio
import sys
import os

def create_teaser():
    input_file = r"C:/Users/sebas/.gemini/antigravity/brain/eaf6d5f6-3d17-469d-8e9e-09db0edf0aef/platform_teaser_interactive_final_1779064864686.webp"
    output_file = "platform_teaser.mp4"
    
    if not os.path.exists(input_file):
        print(f"Input file not found: {input_file}")
        return
        
    print(f"Converting {input_file} to MP4...")
    try:
        reader = imageio.get_reader(input_file)
        writer = imageio.get_writer(output_file, fps=24, codec="libx264")
        
        # We can just write every frame. 
        # To speed it up slightly (e.g. 1.25x), we can just set fps=30 (24 * 1.25)
        writer = imageio.get_writer(output_file, fps=30, codec="libx264")
        
        frame_count = 0
        for frame in reader:
            writer.append_data(frame)
            frame_count += 1
            if frame_count % 50 == 0:
                print(f"Processed {frame_count} frames...")
                
        writer.close()
        reader.close()
        print("Teaser successfully generated!")
        
    except Exception as e:
        print(f"Error processing video: {e}")

if __name__ == '__main__':
    create_teaser()
